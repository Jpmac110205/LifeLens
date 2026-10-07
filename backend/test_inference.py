"""Real checkpoint and Grad-CAM regression checks; no network requests."""
from io import BytesIO
import unittest

import numpy as np
from PIL import Image
import torch
from torchvision.models import resnet18

from backend.demo_model import load_model, predict_cancer_with_gradcam, transform
from backend.explainability import GradCAM


class InferenceTests(unittest.TestCase):
    def test_gradcam_matches_full_backward_without_parameter_gradients(self):
        torch.manual_seed(17)
        model = resnet18(weights=None).eval()
        inputs = torch.rand(1, 3, 224, 224)
        captured = {}

        def capture(module, args, output):
            captured['activation'] = output
            output.retain_grad()

        handle = model.layer4[-1].register_forward_hook(capture)
        output = model(inputs)
        selected = output.argmax(dim=1).item()
        output[0, selected].backward()
        activation = captured['activation']
        weights = activation.grad.mean(dim=(2, 3), keepdim=True)
        expected = torch.relu((weights * activation.detach()).sum(dim=1, keepdim=True))
        expected = torch.nn.functional.interpolate(expected, size=(224, 224), mode='bilinear', align_corners=False)
        expected = expected.squeeze().numpy()
        expected = (expected - expected.min()) / (expected.max() - expected.min() + 1e-8)
        handle.remove()
        model.zero_grad(set_to_none=True)
        model.requires_grad_(False)
        cam = GradCAM(model, model.layer4[-1])
        try:
            actual_output = model(inputs)
            actual = cam.generate(inputs, selected, actual_output)
            torch.testing.assert_close(actual_output, output)
            np.testing.assert_allclose(actual, expected, rtol=1e-5, atol=1e-6)
            self.assertTrue(all(parameter.grad is None for parameter in model.parameters()))
        finally:
            cam.close()
        self.assertFalse(model.layer4[-1]._forward_hooks)

    def test_both_checkpoints_keep_predictions_and_bound_overlay(self):
        with Image.new('RGB', (2048, 1200), (180, 70, 100)) as image:
            buffer = BytesIO()
            image.save(buffer, format='PNG')
            inputs = transform(image).unsqueeze(0)
        for cancer_type in ('breast', 'melanoma'):
            with self.subTest(cancer_type=cancer_type):
                model = load_model(cancer_type)
                with torch.no_grad():
                    probabilities = model(inputs).softmax(dim=1)[0]
                selected = probabilities.argmax().item()
                expected_confidence = round(probabilities[selected].item() * 100, 2)
                del model
                confidence, diagnosis, overlay = predict_cancer_with_gradcam(buffer.getvalue(), cancer_type)
                self.assertEqual(confidence, expected_confidence)
                self.assertEqual(diagnosis, 'benign' if selected == 0 else 'malignant')
                self.assertEqual(overlay.shape, (600, 1024, 3))
                self.assertEqual(overlay.dtype, np.uint8)


if __name__ == '__main__':
    unittest.main()
