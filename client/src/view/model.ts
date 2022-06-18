import { State } from "../stage";
import { Sprite, playAnimation, playSound } from "../utils";

export interface SoundState extends State {
  resource: string;
  volume: number;
  range: number;
  x: number;
  y: number;
  isPlayed: boolean;
}

export interface PersonState extends State {
  x: number;
  y: number;
  angle: number;
  sprite: number;
  animation: number;
  hp: number;
  ammo: number;
  weapon: number;
  owner: string;
}

export interface ItemState extends State {
  x: number;
  y: number;
}

export interface BulletState extends State {
  x: number;
  y: number;
  angle: number;
  sprite: number;
}

export interface WallState extends State {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Utils {
  playAnimation: ReturnType<typeof playAnimation>;
  playSound: ReturnType<typeof playSound>;
}

export interface Options {
  fps: number;
  width: number;
  height: number;
  me: string;
  map: any;
  resources: { [n: string]: string };
  sprites: { [n: number]: Sprite };
  weapons: { [n: number]: string };
}