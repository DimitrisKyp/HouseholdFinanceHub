// Puts elements into a translated sentence: rich("Sent to {email}.", { email: <b>…</b> }).
// The translator leaves {placeholders} it has no value for, so pass the text through t() without them.
import { Fragment } from "react";

export function rich(text, elements) {
  return text.split(/(\{\w+\})/g).map((part, index) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    return <Fragment key={index}>{name && name in elements ? elements[name] : part}</Fragment>;
  });
}
