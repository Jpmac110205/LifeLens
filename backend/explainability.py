import cv2
import numpy as np
import torch
import torch.nn.functional as F


class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.activations = None
        self.forward_handle = target_layer.register_forward_hook(self._capture)

    def _capture(self, module, inputs, output):
        # Grad-CAM needs the derivative at this layer, not at model weights or
        # earlier layers. Reconnect only this activation to the classifier head.
        self.activations = output.detach().requires_grad_(True)
        return self.activations

    def generate(self, input_tensor, class_idx=None, output=None):
        if output is None:
            output = self.model(input_tensor)
        if class_idx is None:
            class_idx = output.argmax(dim=1).item()
        if self.activations is None:
            raise RuntimeError('The model did not produce attention-map activations.')
        gradients, = torch.autograd.grad(output[0, class_idx], self.activations)
        weights = gradients.mean(dim=(2, 3), keepdim=True)
        cam = F.relu((weights * self.activations.detach()).sum(dim=1, keepdim=True))
        cam = F.interpolate(cam, size=input_tensor.shape[2:], mode='bilinear', align_corners=False)
        cam = cam.squeeze().cpu().numpy()
        return (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)

    def close(self):
        self.forward_handle.remove()
        self.activations = None


def overlay_heatmap(img, cam, alpha=0.5, colormap=cv2.COLORMAP_JET):
    cam_resized = cv2.resize(cam, (img.shape[1], img.shape[0]))
    heatmap = cv2.applyColorMap(np.uint8(255 * cam_resized), colormap)
    # OpenCV colormaps return BGR; uploaded images and PNG export use RGB.
    heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
    return cv2.addWeighted(heatmap, alpha, img, 1 - alpha, 0)
