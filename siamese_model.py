import numpy as np

class SiameseAuthenticator:

    def __init__(self, threshold=0.7):
        self.threshold = threshold

    def verify(self, base_vec, current_vec):

        dist = np.linalg.norm(base_vec - current_vec)

        similarity = 1 / (1 + dist)

        is_same = similarity > self.threshold

        return similarity, is_same