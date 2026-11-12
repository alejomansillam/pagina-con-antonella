export function messageText(value: string) {
  const body = value.trim();
  if (!body) throw new Error("Escribí un mensaje");
  if (body.length > 4000) throw new Error("El mensaje es demasiado largo");
  return body;
}

export function validateChat(kind: "direct" | "group", name: string, members: string[]) {
  const unique = [...new Set(members)];
  if (kind === "direct" && unique.length !== 1) throw new Error("Seleccioná una persona");
  if (kind === "group" && (!name.trim() || name.trim().length > 100 || !unique.length)) {
    throw new Error("Ingresá un nombre y seleccioná integrantes");
  }
  return unique;
}