import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { ActorCompiler } from 'terse-sdk/dev';
import { prepareCloudProject } from './cloud-project.js';

const directory = resolve('.terse/whitechapel-sixth-murder');
const story = await prepareCloudProject(directory, process.env.STORY_PATH ?? 'stories/sixth-murder/story.json');
await promisify(execFile)('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: directory });
await promisify(execFile)(process.execPath, ['node_modules/typescript/bin/tsc', '--project', directory]);
const contract = new ActorCompiler().compileContract(resolve(directory, 'src/actor.ts'));
console.log(`Prepared ${story.storyId} v${story.storyVersion}: ${contract.actors.map(actor => actor.actorName).join(', ')}.\nDeployment project: ${directory}`);
