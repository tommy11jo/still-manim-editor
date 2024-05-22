export interface MobjectMetadata {
  parent: string
  type: string
  id: string
  children: string[]
  classname: string
  path: string
  lineno: number
}

export type MobjectMetadataMap = Record<string, MobjectMetadata>
