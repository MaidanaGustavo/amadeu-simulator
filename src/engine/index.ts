export * from './Simulacao';
import { Simulacao } from './Simulacao';
/** Instância única do motor, compartilhada pela cena (60 Hz) e pela HUD (~8 Hz). */
export const sim = new Simulacao();
