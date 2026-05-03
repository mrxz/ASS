export function createStyle(dialogue, store) {
  const { layer, align, effect, pos, margin, q } = dialogue;
  let cssText = '';
  if (layer) cssText += `z-index:${layer};`;
  cssText += `text-align:${['left', 'center', 'right'][align.h]};`;
  if (!effect) {
    if (q !== 2) {
      cssText += `max-width:calc(100% - ${store.scale} * ${margin.left + margin.right}px);`;
    }
    if (!pos) {
      if (align.h !== 0) {
        cssText += `padding-right:calc(${store.scale} * ${margin.right}px);`;
      }
      if (align.h !== 2) {
        cssText += `padding-left:calc(${store.scale} * ${margin.left}px);`;
      }
    }
  }
  return cssText;
}
