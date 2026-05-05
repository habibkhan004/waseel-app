#!/usr/bin/env python3
"""
AWS Polly healthcheck: loads AWS_* from .env next to this script (no secrets printed).
"""
import os
import sys

try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
except ImportError:
    print("FAIL: boto3 not installed. Run: pip install boto3")
    sys.exit(2)


def load_dotenv(path):
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            k, _, v = line.partition("=")
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v


def main():
    root = os.path.dirname(os.path.abspath(__file__))
    load_dotenv(os.path.join(root, ".env"))

    region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "us-east-1"
    key = os.environ.get("AWS_ACCESS_KEY_ID", "").strip()
    secret = os.environ.get("AWS_SECRET_ACCESS_KEY", "").strip()
    token = os.environ.get("AWS_SESSION_TOKEN", "").strip()

    if not key or not secret:
        print("FAIL: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY missing in .env")
        print("      Or run: aws configure")
        sys.exit(1)

    print(f"Region: {region}")
    print("Checking STS get-caller-identity...")
    try:
        sts = boto3.client(
            "sts",
            region_name=region,
            aws_access_key_id=key,
            aws_secret_access_key=secret,
            aws_session_token=token or None,
        )
        ident = sts.get_caller_identity()
        print(f"OK STS: Account={ident.get('Account')} Arn={ident.get('Arn')}")
    except (BotoCoreError, ClientError) as e:
        print(f"FAIL STS: {e}")
        sys.exit(1)

    voice = os.environ.get("AWS_TTS_VOICE_EN", "Joanna").strip() or "Joanna"
    engine = os.environ.get("AWS_TTS_ENGINE", "neural").strip() or "neural"
    print(f"Checking Polly synthesize_speech (voice={voice}, engine={engine})...")
    try:
        polly = boto3.client(
            "polly",
            region_name=region,
            aws_access_key_id=key,
            aws_secret_access_key=secret,
            aws_session_token=token or None,
        )
        resp = polly.synthesize_speech(
            Text="Polly health check.",
            OutputFormat="mp3",
            VoiceId=voice,
            Engine=engine,
        )
        audio = resp["AudioStream"].read()
        out = os.path.join(root, "healthcheck_polly.mp3")
        with open(out, "wb") as f:
            f.write(audio)
        print(f"OK Polly: wrote {len(audio)} bytes -> {out}")
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        msg = e.response.get("Error", {}).get("Message", str(e))
        print(f"FAIL Polly: {code} {msg}")
        if code == "AccessDeniedException":
            print("      Attach IAM: polly:SynthesizeSpeech (and polly:DescribeVoices optional)")
        sys.exit(1)
    except BotoCoreError as e:
        print(f"FAIL Polly: {e}")
        sys.exit(1)

    print("describe_voices (first 3)...")
    try:
        v = polly.describe_voices()
        for voice in v.get("Voices", [])[:3]:
            print(f"  - {voice.get('Id')} ({voice.get('Gender')})")
    except (BotoCoreError, ClientError) as e:
        print(f"WARN describe_voices: {e}")

    print("All checks passed.")


if __name__ == "__main__":
    main()
