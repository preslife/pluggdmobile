// @ts-ignore
import lamejs from 'lamejs';

export class MP3Encoder {
  private mp3encoder: any;
  private sampleRate: number;
  private channels: number;

  constructor(sampleRate: number = 44100, channels: number = 1, kbps: number = 128) {
    this.sampleRate = sampleRate;
    this.channels = channels;
    this.mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
  }

  encodeBuffer(audioBuffer: AudioBuffer): Uint8Array {
    const samples = this.convertToMp3Format(audioBuffer);
    const mp3Data: Uint8Array[] = [];
    
    if (this.channels === 1) {
      const mp3buf = this.mp3encoder.encodeBuffer(samples);
      if (mp3buf.length > 0) {
        mp3Data.push(new Uint8Array(mp3buf));
      }
    } else {
      // Stereo encoding would go here
      throw new Error('Stereo encoding not implemented');
    }

    const finalMp3buf = this.mp3encoder.flush();
    if (finalMp3buf.length > 0) {
      mp3Data.push(new Uint8Array(finalMp3buf));
    }

    return this.concatUint8Arrays(mp3Data);
  }

  private convertToMp3Format(audioBuffer: AudioBuffer): Int16Array {
    const samples = audioBuffer.getChannelData(0);
    const int16Array = new Int16Array(samples.length);
    
    for (let i = 0; i < samples.length; i++) {
      // Convert from [-1, 1] to [-32768, 32767]
      int16Array[i] = Math.max(-32768, Math.min(32767, samples[i] * 32767));
    }
    
    return int16Array;
  }

  private concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
    let totalLength = 0;
    for (const array of arrays) {
      totalLength += array.length;
    }
    
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const array of arrays) {
      result.set(array, offset);
      offset += array.length;
    }
    
    return result;
  }
}