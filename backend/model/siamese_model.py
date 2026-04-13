import torch
import torch.nn as nn

class SiameseNetwork(nn.Module):
    def __init__(self, input_size=4):
        super(SiameseNetwork, self).__init__()

        self.fc = nn.Sequential(
            nn.Linear(input_size, 16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.ReLU(),
            nn.Linear(8, 4)
        )

    def forward_once(self, x):
        return self.fc(x)

    def forward(self, x1, x2):
        out1 = self.forward_once(x1)
        out2 = self.forward_once(x2)
        return out1, out2