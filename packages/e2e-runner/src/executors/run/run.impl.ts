import { ExecutorContext } from '@nrwl/devkit'

import { NxTarget, NxTargetOptions } from './utils/nx-target'
import {RunCommandsOptions} from '@nrwl/workspace/src/executors/run-commands/run-commands.impl';

interface Options {
  runner: 'cypress' | 'playwright' | 'run-commands'
  runnerTarget?: string
  watch?: boolean
  targets: NxTargetOptions[]
}

let runningTargets = []

export async function endToEndRunner(options: Options, context: ExecutorContext): Promise<{ success: boolean }> {
  let success: boolean

  const { runner, targets, ...rest } = options

  runningTargets = targets.map((targetOptions) => new NxTarget(targetOptions))

  // Start all targets
  await Promise.all(runningTargets.map((nxTarget) => nxTarget.setup()))

  try {
    if (runner === 'cypress') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const cypressExecutor = require('@nrwl/cypress/src/executors/cypress/cypress.impl').default
      success = (await cypressExecutor(rest, context)).success

    } else if (runner === 'playwright') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const playwrightExecutor = require('@nx-extend/playwright/src/executors/test/test.impl').default
      success = (await playwrightExecutor(rest, context)).success

    }else if (runner === 'run-commands') {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const runCommandsExecutor = require('@nrwl/workspace/src/executors/run-commands/run-commands.impl').default;
			success = (await runCommandsExecutor(rest as RunCommandsOptions, context)).success;
		} else {
      throw new Error(`Unknown runner "${runner}"`)
    }
  } catch (error) {
    console.error(error)

    success = false
  }

  // Kill all targets
  await Promise.all(runningTargets.map((nxTarget) => nxTarget.teardown()))

  return { success }
}

process.on('SIGINT', async function () {
  // Kill all targets
  await Promise.all(runningTargets.map((nxTarget) => nxTarget.teardown()))

  process.exit()
})

export default endToEndRunner