export interface Toast {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
}

let nextId = 1;

class Toasts {
  list = $state<Toast[]>([]);

  show(kind: Toast["kind"], message: string, ms = kind === "error" ? 7000 : 3500) {
    const id = nextId++;
    this.list.push({ id, kind, message });
    setTimeout(() => this.dismiss(id), ms);
  }

  dismiss(id: number) {
    this.list = this.list.filter((t) => t.id !== id);
  }
}

export const toasts = new Toasts();
