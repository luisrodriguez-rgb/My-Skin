export function setupTabs(onActivate: (panel: string) => void) {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('nav.tabs [role="tab"]')];
  function activate(id: string, focus = false) {
    const target = tabs.find((tab) => tab.getAttribute("aria-controls") === id);
    if (!target) return;
    for (const tab of tabs) {
      const selected = tab === target;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const panelId = tab.getAttribute("aria-controls");
      if (panelId) {
        const panel = document.getElementById(panelId);
        if (panel) panel.hidden = !selected;
      }
    }
    if (focus) target.focus();
    onActivate(id);
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activate(tab.getAttribute("aria-controls")!));
    tab.addEventListener("keydown", (event) => {
      let next: number;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault();
      activate(tabs[next].getAttribute("aria-controls")!, true);
    });
  });
  return activate;
}
