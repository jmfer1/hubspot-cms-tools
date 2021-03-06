const {
  loadConfig,
  validateConfig,
  checkAndWarnGitInclusion,
} = require('@hubspot/cms-lib');
const { logger } = require('@hubspot/cms-lib/logger');
const {
  logServerlessFunctionApiErrorInstance,
  ApiErrorContext,
} = require('@hubspot/cms-lib/errorHandlers');
const { fetchSecrets } = require('@hubspot/cms-lib/api/secrets');

const { validatePortal } = require('../../lib/validation');
const { trackCommandUsage } = require('../../lib/usageTracking');

const {
  addConfigOptions,
  addPortalOptions,
  addUseEnvironmentOptions,
  setLogLevel,
  getPortalId,
} = require('../../lib/commonOpts');
const { logDebugInfo } = require('../../lib/debugInfo');

exports.command = 'list';
exports.describe = 'List all HubSpot secrets';

exports.handler = async options => {
  setLogLevel(options);
  logDebugInfo(options);
  const { config: configPath } = options;
  loadConfig(configPath, options);
  checkAndWarnGitInclusion();

  if (!(validateConfig() && (await validatePortal(options)))) {
    process.exit(1);
  }
  const portalId = getPortalId(options);
  trackCommandUsage('secrets-list', {}, portalId);

  try {
    const { results } = await fetchSecrets(portalId);
    const groupLabel = `Secrets for portal ${portalId}:`;
    logger.group(groupLabel);
    results.forEach(secret => logger.log(secret));
    logger.groupEnd(groupLabel);
  } catch (e) {
    logger.error('The secrets could not be listed');
    await logServerlessFunctionApiErrorInstance(
      portalId,
      e,
      new ApiErrorContext({
        request: 'add secret',
        portalId,
      })
    );
  }
};

exports.builder = yargs => {
  addConfigOptions(yargs, true);
  addPortalOptions(yargs, true);
  addUseEnvironmentOptions(yargs, true);
  return yargs;
};
