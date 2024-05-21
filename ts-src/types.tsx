// used for selection
export type Point = [number, number]

export interface MobjectMetadata {
  //   points: Point[]
  parent: string
  type: string
  id: string
  children: string[]
  classname: string
  path: string
  lineno: number
}

export type MobjectMetadataMap = Record<string, MobjectMetadata>
