export class PlayDto {
  // Hacer uris opcional
  uris?: string[]; 
  // Agregar context_uri
  context_uri?: string;
  device_id: string | undefined;
  // offset opcional para empezar desde una pista específica dentro del contexto
  offset?: {
    position?: number; // Índice de la pista
    uri?: string;      // URI específica de la pista
  };
  // position_ms opcional para empezar desde una posición específica
  position_ms?: number;
}