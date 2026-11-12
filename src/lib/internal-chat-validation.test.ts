import { describe, it as test } from "node:test";
import { deepStrictEqual, strictEqual, throws } from "node:assert";
import { messageText, validateChat } from "./internal-chat-validation";

describe("Chat interno", () => {
  test("el chat individual tiene exactamente un destinatario", () => {
    deepStrictEqual(validateChat("direct", "", ["gestor-1"]), ["gestor-1"]);
    throws(() => validateChat("direct", "", ["gestor-1", "gestor-2"]));
    throws(() => validateChat("direct", "", []));
  });
  test("crear grupo requiere nombre e integrantes", () => {
    deepStrictEqual(validateChat("group", "Equipo", ["gestor-1", "gestor-2"]), ["gestor-1", "gestor-2"]);
    throws(() => validateChat("group", " ", ["gestor-1"]));
    throws(() => validateChat("group", "Equipo", []));
  });
  test("los mensajes de texto no pueden estar vacíos", () => {
    strictEqual(messageText(" Hola equipo "), "Hola equipo");
    throws(() => messageText("\n "));
  });
});