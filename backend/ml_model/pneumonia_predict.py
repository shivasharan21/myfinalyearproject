"""
Pneumonia Prediction Script
Uses the PyTorch ResNet18 model trained for pneumonia detection.
"""

import sys
import json
import os
import io
import base64
from PIL import Image
import torch
import torch.nn as nn
from torchvision import models, transforms

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, 'pneumonia_best.pth')

DEVICE = torch.device('cpu')
CLASS_NAMES = ['NORMAL', 'PNEUMONIA']

def build_model():
    m = models.resnet18(weights=None)
    m.fc = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(m.fc.in_features, 2)
    )
    return m

def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"'{MODEL_PATH}' not found. Place it in the ml_model directory")
    model = build_model()
    model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
    model.eval()
    return model

preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

def predict(model, image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    tensor = preprocess(img).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1)[0]
    idx = probs.argmax().item()
    return {
        'prediction': CLASS_NAMES[idx],
        'probability': round(probs[idx].item() * 100, 2),
        'probabilities': {
            'NORMAL': round(probs[0].item() * 100, 2),
            'PNEUMONIA': round(probs[1].item() * 100, 2),
        }
    }

if __name__ == '__main__':
    try:
        # Read base64 encoded image from stdin
        input_data = json.loads(sys.stdin.read())
        image_b64 = input_data.get('image')
        if not image_b64:
            raise ValueError("No image data provided")

        # Decode base64 to bytes
        image_bytes = base64.b64decode(image_b64)

        model = load_model()
        result = predict(model, image_bytes)

        # Add risk level
        if result['prediction'] == 'PNEUMONIA':
            if result['probability'] > 80:
                risk = 'High Risk'
            elif result['probability'] > 60:
                risk = 'Moderate Risk'
            else:
                risk = 'Low Risk'
        else:
            risk = 'Low Risk'

        result['risk'] = risk
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)