import cv2
import numpy as np
import torch.nn.functional as F


class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.gradients = None
        self.activations = None
        self.gradient_handle = None
        self.forward_handle = target_layer.register_forward_hook(self._capture)

    def _capture(self, module, inputs, output):
        self.activations = output.detach()
        if self.gradient_handle is not None:
            self.gradient_handle.remove()
        if output.requires_grad:
            self.gradient_handle = output.register_hook(self._capture_gradient)

    def _capture_gradient(self, gradient):
        self.gradients = gradient.detach()

    def generate(self, input_tensor, class_idx=None, output=None):
        if output is None:
            output = self.model(input_tensor)
        if class_idx is None:
            class_idx = output.argmax(dim=1).item()
        self.model.zero_grad(set_to_none=True)
        output[0, class_idx].backward()
        if self.gradients is None or self.activations is None:
            raise RuntimeError('The model did not produce attention-map gradients.')
        weights = self.gradients.mean(dim=(2, 3), keepdim=True)
        cam = F.relu((weights * self.activations).sum(dim=1, keepdim=True))
        cam = F.interpolate(cam, size=input_tensor.shape[2:], mode='bilinear', align_corners=False)
        cam = cam.squeeze().cpu().numpy()
        return (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)

    def close(self):
        self.forward_handle.remove()
        if self.gradient_handle is not None:
            self.gradient_handle.remove()
        self.activations = None
        self.gradients = None


def overlay_heatmap(img, cam, alpha=0.5, colormap=cv2.COLORMAP_JET):
    cam_resized = cv2.resize(cam, (img.shape[1], img.shape[0]))
    heatmap = cv2.applyColorMap(np.uint8(255 * cam_resized), colormap)
    # OpenCV colormaps return BGR; uploaded images and PNG export use RGB.
    heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
    return cv2.addWeighted(heatmap, alpha, img, 1 - alpha, 0)
