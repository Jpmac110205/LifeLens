"""API regression tests. Does not call OpenAI or load real checkpoints."""
from concurrent.futures import ThreadPoolExecutor
from threading import Event
import base64
from io import BytesIO
import os
import unittest
from unittest.mock import AsyncMock, patch

import numpy as np
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage, SystemMessage
from PIL import Image

from backend.main import app, determine_risk_level


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.analysis = {'cancerType': 'breast', 'diagnosis': 'benign', 'certainty_percent': 91.2, 'riskLevel': 'low'}
        buffer = BytesIO()
        Image.new('RGB', (32, 24), 'red').save(buffer, 'PNG')
        self.image = buffer.getvalue()

    def predict(self, content=None, content_type='image/png', cancer_type='breast'):
        return self.client.post('/predict', files={'file': ('research.png', self.image if content is None else content, content_type)}, data={'cancerType': cancer_type})

    def test_health_does_not_expose_any_session_data(self):
        data = self.client.get('/health').json()
        self.assertEqual(data['status'], 'healthy')
        self.assertNotIn('currentResults', data)
        self.assertNotIn('history', data)

    def test_type_selection_accepts_json_and_rejects_unsupported_types(self):
        self.assertEqual(self.client.post('/set-cancer-type', json={'cancerType': 'melanoma'}).status_code, 200)
        self.assertEqual(self.predict(cancer_type='lung').status_code, 422)

    def test_unsupported_mime_empty_and_corrupt_images(self):
        self.assertEqual(self.predict(content_type='application/dicom').status_code, 415)
        self.assertEqual(self.predict(content=b'').status_code, 400)
        self.assertEqual(self.predict(content=b'not an image').status_code, 400)

    def test_large_upload_and_dimensions(self):
        self.assertEqual(self.predict(content=b'x' * (10 * 1024 * 1024 + 1)).status_code, 413)
        buffer = BytesIO()
        Image.new('L', (5001, 5000)).save(buffer, 'PNG')
        self.assertEqual(self.predict(content=buffer.getvalue()).status_code, 413)

    @patch('backend.main.predict_cancer_with_gradcam')
    def test_valid_prediction_includes_readable_overlay(self, predict_model):
        predict_model.return_value = (91.2, 'benign', np.zeros((24, 32, 3), dtype=np.uint8))
        response = self.predict()
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['riskLevel'], 'low')
        self.assertEqual(predict_model.call_args.args[1], 'breast')
        encoded = data['gradcam_overlay'].split(',', 1)[1]
        self.assertEqual(Image.open(BytesIO(base64.b64decode(encoded))).size, (32, 24))

    @patch('backend.main.predict_cancer_with_gradcam', side_effect=FileNotFoundError)
    def test_missing_model_returns_recoverable_error(self, _):
        self.assertEqual(self.predict().status_code, 503)

    def test_overlapping_prediction_is_rejected_while_health_stays_available(self):
        started, release = Event(), Event()

        def inference(image, cancer_type):
            started.set()
            if not release.wait(5):
                raise RuntimeError('Test inference was not released')
            return (91.2, 'benign', np.zeros((24, 32, 3), dtype=np.uint8))

        with patch('backend.main.predict_cancer_with_gradcam', side_effect=inference) as model:
            with ThreadPoolExecutor(max_workers=1) as executor:
                first = executor.submit(self.predict)
                try:
                    self.assertTrue(started.wait(5))
                    busy = self.predict()
                    self.assertEqual(busy.status_code, 503)
                    self.assertIn('busy', busy.json()['detail'])
                    self.assertEqual(self.client.get('/health').status_code, 200)
                    self.assertEqual(model.call_count, 1)
                finally:
                    release.set()
                self.assertEqual(first.result(timeout=5).status_code, 200)
            self.assertEqual(self.predict().status_code, 200)

    def test_chat_requires_analysis_and_valid_limits(self):
        self.assertEqual(self.client.post('/chat', json={'message': 'Hello'}).status_code, 422)
        self.assertEqual(self.client.post('/chat', json={'message': ' ', 'analysis': self.analysis}).status_code, 400)
        self.assertEqual(self.client.post('/chat', json={'message': 'x' * 2001, 'analysis': self.analysis}).status_code, 422)
        self.assertEqual(self.client.post('/chat', json={'message': 'Hello', 'analysis': {**self.analysis, 'certainty_percent': 101}}).status_code, 422)

    @patch.dict(os.environ, {'OPENAI_API_KEY': ''})
    def test_missing_chat_key_does_not_prevent_health_or_predictions(self):
        self.assertEqual(self.client.get('/health').status_code, 200)
        self.assertEqual(self.client.post('/chat', json={'message': 'Hello', 'analysis': self.analysis}).status_code, 503)

    @patch.dict(os.environ, {'OPENAI_API_KEY': 'test-only'})
    @patch('backend.main.ChatOpenAI')
    def test_chat_results_and_histories_are_isolated(self, model):
        model.return_value.ainvoke = AsyncMock(return_value=AIMessage(content='Research explanation'))
        first = self.client.post('/chat', json={'message': 'First session', 'analysis': self.analysis, 'history': [{'role': 'user', 'content': 'Private session one'}]})
        first_messages = model.return_value.ainvoke.call_args.args[0]
        self.assertEqual(first.status_code, 200)
        second = self.client.post('/chat', json={'message': 'Second session', 'analysis': {**self.analysis, 'cancerType': 'melanoma', 'diagnosis': 'malignant', 'riskLevel': 'low'}, 'history': []})
        second_messages = model.return_value.ainvoke.call_args.args[0]
        self.assertEqual(second.status_code, 200)
        self.assertIsInstance(second_messages[0], SystemMessage)
        self.assertIn('Private session one', str(first_messages))
        self.assertNotIn('Private session one', str(second_messages))
        self.assertIn('Model: melanoma', second_messages[0].content)
        self.assertIn('Model risk indicator: high', second_messages[0].content)

    @patch.dict(os.environ, {'OPENAI_API_KEY': 'test-only'})
    @patch('backend.main.ChatOpenAI')
    def test_provider_error_is_a_failure_and_does_not_expose_details(self, model):
        model.return_value.ainvoke = AsyncMock(side_effect=RuntimeError('private provider error'))
        response = self.client.post('/chat', json={'message': 'Hello', 'analysis': self.analysis})
        self.assertEqual(response.status_code, 502)
        self.assertNotIn('private provider error', response.text)

    def test_export_contains_only_request_context(self):
        response = self.client.post('/export/conversation', json={'analysis': self.analysis, 'history': []})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['data']['conversation_history'], [])

    def test_risk_thresholds(self):
        self.assertEqual(determine_risk_level('malignant', 70), 'high')
        self.assertEqual(determine_risk_level('benign', 70), 'low')
        self.assertEqual(determine_risk_level('benign', 69), 'medium')


if __name__ == '__main__':
    unittest.main()
