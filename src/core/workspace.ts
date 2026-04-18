import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';

export interface Workspace {
  rootDir: string;
  inputPath: string;
  extractedDir: string;
  outputPath: string;
}

export async function createWorkspace(tempRootDir?: string): Promise<Workspace> {
  const workspaceRoot = await fs.mkdtemp(path.join(tempRootDir || os.tmpdir(), 'dyslibria-converter-'));

  return {
    rootDir: workspaceRoot,
    inputPath: path.join(workspaceRoot, 'input.epub'),
    extractedDir: path.join(workspaceRoot, 'extracted'),
    outputPath: path.join(workspaceRoot, 'output.epub')
  };
}

export async function cleanupWorkspace(workspace: Workspace): Promise<void> {
  await fs.remove(workspace.rootDir);
}
