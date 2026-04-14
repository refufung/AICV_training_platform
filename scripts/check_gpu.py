"""
GPU/CUDA Availability Check
Run: python scripts/check_gpu.py
"""
import sys
import platform

def main():
    print("=" * 50)
    print("  GPU / CUDA Availability Check")
    print("=" * 50)
    print(f"  Python:   {sys.version}")
    print(f"  Platform: {platform.system()} {platform.release()}")
    print()

    # --- PyTorch ---
    try:
        import torch
        print(f"  PyTorch:       {torch.__version__}")
        print(f"  CUDA available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"  CUDA version:  {torch.version.cuda}")
            print(f"  GPU count:     {torch.cuda.device_count()}")
            for i in range(torch.cuda.device_count()):
                name = torch.cuda.get_device_name(i)
                mem = torch.cuda.get_device_properties(i).total_mem / (1024**3)
                print(f"  GPU {i}:         {name} ({mem:.1f} GB)")
        else:
            print("  WARNING: CUDA not available — training will use CPU (slow)")
    except ImportError:
        print("  PyTorch: NOT INSTALLED (pip install torch torchvision)")

    print()

    # --- ONNX Runtime ---
    try:
        import onnxruntime as ort
        providers = ort.get_available_providers()
        print(f"  ONNX Runtime:  {ort.__version__}")
        print(f"  Providers:     {', '.join(providers)}")
        has_gpu = "CUDAExecutionProvider" in providers
        print(f"  GPU inference: {'YES' if has_gpu else 'NO (CPU only)'}")
    except ImportError:
        print("  ONNX Runtime: NOT INSTALLED (pip install onnxruntime-gpu)")

    print()

    # --- OpenCV ---
    try:
        import cv2
        print(f"  OpenCV:  {cv2.__version__}")
        build_info = cv2.getBuildInformation()
        has_cuda = "CUDA:                      YES" in build_info
        print(f"  OpenCV CUDA: {'YES' if has_cuda else 'NO (CPU build)'}")
    except ImportError:
        print("  OpenCV: NOT INSTALLED")

    print()
    print("=" * 50)

if __name__ == "__main__":
    main()
