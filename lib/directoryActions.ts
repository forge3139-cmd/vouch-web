'use server'

import { loadDirectory, type DirectoryEntry, type DirectoryParams } from './directory'

export async function searchDirectoryAction(params: DirectoryParams): Promise<DirectoryEntry[]> {
  return loadDirectory(params)
}
