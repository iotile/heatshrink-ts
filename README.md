# Typescript Decoder for Heatshrink

[![Travis](https://img.shields.io/travis/iotile/heatshrink-ts.svg)](https://travis-ci.org/iotile/heatshrink-ts)
[![Coverage Status](https://coveralls.io/repos/github/iotile/heatshrink-ts/badge.svg?branch=master)](https://coveralls.io/github/iotile/heatshrink-ts?branch=master)
[![GitHub license](https://img.shields.io/github/license/iotile/heatshrink-ts.svg)](https://github.com/iotile/heatshrink-ts/blob/master/LICENSE)

### Introduction

Heatshrink is a compression library that can be used in very low resource microcontroller devices.  It is based on LZSS encoding, which 
looks for repeated strings of characters and replaces them with references to a previous occurence rather than repeating them.

You can read more details at the repository for the original C implementation of [heatshrink](https://github.com/atomicobject/heatshrink/).

This typescript package only implements the heatshrink decoding process so it can decode compressed data that it receives from
a device using the heatshrink library.  It is written in typescript and distributed on NPM for easy installation and usage.

### Installation and Basic Usage

```shell
npm install heatshrink-ts
```

The primary class is the `HeatshrinkDecoder` object that can take in compressed data and turn it back into uncompressed data.

```typescript

import { HeatshrinkDecoder } from "heatshrink-ts";

const WINDOW_BITS = 8;
const LOOKAHEAD_BITS = 4;
const INPUT_BUFFER_LENGTH = 64;

// Heatshrink Encoded form of the ASCII string 'this is a test'
let encodedInput = new Uint8Array([0xba, 0x5a, 0x2d, 0x37, 0x39, 0x00, 0x08, 0xac, 0x32, 0x0b, 0xa5, 0x96, 0xe7, 0x74]);

let decoder = new HeatshrinkDecoder(WINDOW_BITS, LOOKAHEAD_BITS, INPUT_BUFFER_LENGTH);
decoder.process(encodedInput);

let output = decoder.getOutput();

// This will print 'Decoded output: this is a test'
let outputString = String.fromCharCode(...output);
console.log("Decoded output: " + outputString);
```

There are 2 key parameters that need to match between the encoder and decoder:

 - The window size (WINDOW_BITS), which is a number between 4 and 15, inclusive
   that sets how large of a sliding window is used to look for repeated strings.
   It is internally considered as a power of 2, so the value 8 would be 2**8 or
   256 bytes for the sliding window.
 
 - The lookahead size (LOOKAHEAD_BITS), which is a number between 2 and 15, always
   strictly smaller than the window size.  This sets how long of a repeated pattern
   the encoder can see and therefore compress.  According to the heatshrink
   documentation, a good size is WINDOW_BITS / 2.
 
**Important:** Neither of these two parameters are transferred with heatshrink compressed
data but they are required to decode it properly.  You must magically know the
right values for the encoder that was used to produce your encoded data or the
decoding process will not produce the correct output.

The input buffer length can be whatever you want but a larger input buffer is
a little more time efficient.  64 bytes is a reasonable value.  This parameter
will probably go away in the future since it is not so meaningful in a
non-embedded context.

### Next Steps

- See [example usage](https://runkit.com/timburke/runkit-npm-heatshrink-ts-example-1) run
immediately on Runkit.

- [Try out the libary](https://npm.runkit.com/heatshrink-ts) yourself on Runkit.

### API Documentation

API Documentation can be found at: https://iotile.github.io/heatshrink-ts/
