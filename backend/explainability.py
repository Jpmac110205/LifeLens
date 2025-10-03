import torch
import torch.nn.functional as F
import cv2
import numpy as np

class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        self._register_hooks()

    def _register_hooks(self):
        def forward_hook(module, input, output):
            self.activations = output.detach()
        def backward_hook(module, grad_in, grad_out):
            self.gradients = grad_out[0].detach()
        self.target_layer.register_forward_hook(forward_hook)
        self.target_layer.register_backward_hook(backward_hook)

    def generate(self, input_tensor, class_idx=None):
        output = self.model(input_tensor)
        if class_idx is None:
            class_idx = output.argmax(dim=1).item()

        self.model.zero_grad()
        one_hot = torch.zeros_like(output)
        one_hot[0, class_idx] = 1
        output.backward(gradient=one_hot, retain_graph=True)

        # Compute weights
        weights = self.gradients.mean(dim=(2,3), keepdim=True)
        cam = (weights * self.activations).sum(dim=1, keepdim=True)

        cam = F.relu(cam)
        cam = F.interpolate(cam, size=input_tensor.shape[2:], mode='bilinear', align_corners=False)
        cam = cam.squeeze().cpu().numpy()
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        return cam

import cv2
import numpy as np

def overlay_heatmap(img, cam, alpha=0.5, colormap=cv2.COLORMAP_JET):
    """
    img: original image (H, W, 3) uint8
    cam: Grad-CAM output (H, W) float normalized 0-1
    """
    # Ensure cam is same size as image
    cam_resized = cv2.resize(cam, (img.shape[1], img.shape[0]))

    # Convert to 0-255 uint8
    heatmap = np.uint8(255 * cam_resized)

    # Apply colormap (converts to 3 channels)
    heatmap = cv2.applyColorMap(heatmap, colormap)

    # Overlay heatmap onto original image
    overlay = cv2.addWeighted(heatmap, alpha, img, 1 - alpha, 0)
    return overlay

