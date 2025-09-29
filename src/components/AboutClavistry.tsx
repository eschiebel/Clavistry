import {Dialog} from './Dialog'

type AboutClavistryProps = {
  open: boolean
  onClose: () => void
}

export function AboutClavistry({open, onClose}: AboutClavistryProps) {
  return (
    <Dialog open={open} title="About Clavistry" subtitle="Clave + artistry" onClose={onClose}>
      <p>
        Select a rhythm and it will show a common hand drum tablature for that rhythm. The Mixer
        lets you adjust the playback. Mute a part and play along.
      </p>

      <table className="about-table">
        <caption className="about-table-heading">Tablature Symbols</caption>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>T</code>
            </td>
            <td>Tone</td>
          </tr>
          <tr>
            <td>
              <code>s</code>
            </td>
            <td>Slap</td>
          </tr>
          <tr>
            <td>
              <code>M</code>
            </td>
            <td>Muff</td>
          </tr>
          <tr>
            <td>
              <code>B</code>
            </td>
            <td>Bass</td>
          </tr>
          <tr>
            <td>
              <code>p</code>
            </td>
            <td>Palm</td>
          </tr>
          <tr>
            <td>
              <code>t</code>
            </td>
            <td>Touch</td>
          </tr>
          <tr>
            <td>
              <code>x</code>
            </td>
            <td>Strike (e.g. a bell hit)</td>
          </tr>
          <tr>
            <td>
              <code>.</code>
            </td>
            <td>Rest</td>
          </tr>
          <tr>
            <td>
              <code>|</code>
            </td>
            <td>Bar separator</td>
          </tr>
        </tbody>
      </table>
      <p>
        A special thanks to Eric the Fish for teaching me how to play so many rhythms, and to
        Russito (aka <span style={{fontStyle: 'italic'}}>El Grande</span>) for his{' '}
        <span style={{fontWeight: 'bold'}}>The Hand Drum Rhythm Book</span> that provided me with
        details where my memory and years of notes failed me.
      </p>
      <p>There's still a lot more to do here...</p>
    </Dialog>
  )
}
