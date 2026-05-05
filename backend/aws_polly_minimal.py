#!/usr/bin/env python3
"""
Minimal AWS Polly TTS Example
=============================
The absolute simplest way to use AWS Polly for text-to-speech
"""

import boto3


def main():
    # Initialize Polly client
    polly = boto3.client("polly", region_name="us-east-1")

    # Text to convert
    text = "Hello! This is AWS Polly Text-to-Speech. It sounds very natural!"

    # Generate speech
    response = polly.synthesize_speech(
        Text=text,
        OutputFormat="mp3",
        VoiceId="Joanna",  # Female voice (change to: Matthew, Justin, Ivy, etc.)
        Engine="neural",  # "neural" for best quality, "standard" for cheaper
    )

    # Save to file
    with open("output.mp3", "wb") as f:
        f.write(response["AudioStream"].read())

    print("Audio saved: output.mp3")

    # Optional: List available voices
    voices = polly.describe_voices()
    print("\nAvailable voices:")
    for voice in voices["Voices"][:5]:
        print(f"  - {voice['Id']} ({voice['Gender']})")


if __name__ == "__main__":
    main()
