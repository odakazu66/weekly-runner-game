// パネル共通: ゲームオーバー画面の上に重ねる簡易モーダル。

export interface PanelHandle {
  body: HTMLElement;
  close: () => void;
}

export function openPanel(title: string, closeLabel: string): PanelHandle {
  const host = document.getElementById("panels");
  if (!host) throw new Error("#panels not found");
  host.replaceChildren();

  const panel = document.createElement("section");
  panel.className = "panel";
  const h = document.createElement("h2");
  h.textContent = title;
  const body = document.createElement("div");
  body.className = "panel-body";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn secondary";
  closeBtn.textContent = closeLabel;
  const close = (): void => {
    host.replaceChildren();
  };
  closeBtn.addEventListener("click", close);
  panel.append(h, body, closeBtn);
  host.append(panel);
  return { body, close };
}

export function note(text: string): HTMLElement {
  const p = document.createElement("p");
  p.className = "note";
  p.textContent = text;
  return p;
}
