import {
  BufferSchema,
  Model,
  uint8,
  uint64,
  int64,
  string8,
  float32,
  bool8,
} from "@geckos.io/typed-array-buffer-schema";

const id = { type: string8, length: 6 };

export default new Model(
  BufferSchema.schema("snapshot", {
    id,
    time: uint64,
    state: {
      sounds: [
        BufferSchema.schema("sounds", {
          id,
          resource: { type: string8, length: 10 },
          volume: float32,
          range: uint64,
          x: int64,
          y: int64,
          isPlayed: uint8,
        }),
      ],
      persons: [
        BufferSchema.schema("persons", {
          id,
          x: int64,
          y: int64,
          angle: float32,
          hp: int64,
          sprite: uint8,
          animation: uint8,
        }),
      ],
      weapons: [
        BufferSchema.schema("weapon", {
          id,
          owner: id,
          bullets: uint64,
          type: uint8,
        }),
      ],
      bullets: [
        BufferSchema.schema("bullets", {
          id,
          x: int64,
          y: int64,
          angle: float32,
          sprite: uint8,
        }),
      ],
      items: [
        BufferSchema.schema("items", {
          id,
          x: int64,
          y: int64,
        }),
      ],
      walls: [
        BufferSchema.schema("walls", {
          id,
          x: int64,
          y: int64,
          width: int64,
          height: int64,
        }),
      ],
    },
  })
);
