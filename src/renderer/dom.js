import { getRealFontSize } from './font-size.js';
import { color2rgba } from '../utils.js';

function encodeText(text, q) {
  return text
    .replace(/\\h/g, ' ')
    .replace(/\\N/g, '\n')
    .replace(/\\n/g, q === 2 ? '\n' : ' ');
}

export function createDialogue(dialogue, store) {
  const strokeScale = store.sbas ? store.scale : 1;

  const { styles } = store;
  const $div = document.createElement('div');
  $div.className = 'ASS-dialogue';
  $div.dataset.wrapStyle = dialogue.q;

  const df = document.createDocumentFragment();
  const { align, slices } = dialogue;
  $div.style.setProperty('transform', `translate(-${['0%', '50%', '100%'][align.h]}, -${['100%', '50%', '0%'][align.v]})`);

  const animations = [];
  slices.forEach((slice) => {
    const style = styles[slice.style];

    const sliceTag = style.tag;
    const borderStyle = style.style.BorderStyle;
    slice.fragments.forEach((fragment) => {
      const { text, drawing } = fragment;
      const tag = { ...sliceTag, ...fragment.tag };

      let lastWasLineBreak = false;
      encodeText(text, dialogue.q).split('\n').forEach((content, idx) => {
        const $span = document.createElement('span');

        if (drawing) {
          console.warning("Drawings aren't supported yet");
          return;
        }

        if (idx) {
          const br = document.createElement('div');
          br.dataset.is = 'br';
          // Repeated line-breaks require fake/empty line height
          if (lastWasLineBreak) {
            br.style.setProperty('height', `${tag.fs * store.scale}px`);
          }
          df.append(br);
          lastWasLineBreak = true;
        }
        if (!content) return;
        lastWasLineBreak = false;

        $span.textContent = content;
        const el = $span;
        el.dataset.text = content;

        // Generate styling
        let cssText = 'position: relative;';
        cssText += `font-size:${getRealFontSize(tag.fn, tag.fs) * store.scale}px;`;
        cssText += `line-height: ${tag.fs * store.scale}px;`;
        cssText += `letter-spacing: ${tag.fsp * store.scale}px;`;
        cssText += `color:${color2rgba(tag.a1 + tag.c1)};`;
        cssText += `font-family:"${tag.fn}";`;
        cssText += tag.b ? `font-weight:${tag.b === 1 ? 'bold' : tag.b};` : '';
        cssText += tag.i ? 'font-style:italic;' : '';
        cssText += (tag.u || tag.s) ? `text-decoration:${tag.u ? 'underline' : ''} ${tag.s ? 'line-through' : ''};` : '';
        $span.style.cssText += cssText;

        if (borderStyle === 1) {
          // Determine shadow and outline pixels sizes.
          // Outline must be at least 1 if there's any shadow.
          const anyShadow = Math.max(tag.xshad, tag.yshad) > 0;
          const xbord = Math.max(anyShadow > 0 ? 1 : 0, tag.xbord) * 2 * strokeScale;
          const $shadowSpan = anyShadow ? $span.cloneNode(true) : null;
          const $borderSpan = xbord > 0 ? $span.cloneNode(true) : null;
          const $textNode = $span.firstChild;

          if (anyShadow) {
            // eslint-disable-next-line unicorn/prefer-modern-dom-apis
            $span.insertBefore($shadowSpan, $textNode);

            cssText = $shadowSpan.style.cssText;
            cssText += 'position: absolute;top: 0;left: 0;z-index: -1;';
            cssText += `-webkit-text-stroke-width: ${xbord}px;`;
            cssText += `-webkit-text-stroke-color: ${color2rgba(tag.a4 + tag.c4)};`;
            cssText += `transform: translate(${strokeScale * tag.xshad}px, ${strokeScale * tag.yshad}px);`;
            $shadowSpan.style.cssText = cssText;
          }

          if (xbord > 0) {
            // eslint-disable-next-line unicorn/prefer-modern-dom-apis
            $span.insertBefore($borderSpan, $textNode);

            cssText = $borderSpan.style.cssText;
            cssText += 'position: absolute;top: 0;left: 0;z-index: -1;';
            cssText += `-webkit-text-stroke-width: ${xbord}px;`;
            cssText += `-webkit-text-stroke-color: ${color2rgba(tag.a3 + tag.c3)};`;
            $borderSpan.style.cssText = cssText;
          }
        } else if (borderStyle === 3) {
          // TODO: Opaque box
        }

        df.append($span);
      });
    });
  });
  $div.append(df);
  return { $div, animations };
}
