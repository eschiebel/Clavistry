# DrumsElementary

- This project uses
  - Node.js (>=18) and npm as the runtime and package manager
  - typescript for development
  - biome for linting and formatting
  - elementary audio for generating drum sounds
  - will be built as a react web app
  

- This project is a drum machine using elementary audio. 
- the rhythms being played are hand drum ensemble rhythms
- The drum sounds will either be samples or generated using elementary audio.
- the rhythm being played defined by a form of tablature
- the tablature is defined in a json file where
  - the time signature is defined (e.g. 6/8)
    - the numerator defines how many pulses there will be in a measure
    - the denominator isn't important in this context but is interesting to the user
  - there are multiple drums and other percussion instruments
  - each drum sound is defined by its drum name + a stroke type
  - the stroke type is a character in the tablature 
    - T = tone
    - s = slap
    - M = muff
    - B = bass
    - p = palm
    - t = touch
    - x = strike
    - . = a rest
    - | = a bar separator
  - each drum's line is a string of characters
  - when played together they form a rhythm
  - for example:
    name: bembe
    time_signature: 6/8
    bell: "|x.x.xx|.x.x.x|"
    quinto: "|ts.tTT|ts.tTT"
    conga: "|ptT.s.|ptT.s.|"
    tumba: "|T.BBtt|T.BBtt|"
- the defined rhythm will loop indefinitely until stopped
- 