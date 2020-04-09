const Config = require("release-it/lib/config");
const Joi = require("@hapi/joi");

const globalConfig = new Config();

const fragmentsTypesSchema = Joi.object({
  title: Joi.string().required(),
  extension: Joi.string().required(),
}).required();

const schema = Joi.object({
  changelogFile: Joi.string().required(),
  changelogDateFormat: Joi.string().required(),
  changelogTemplate: Joi.string().required(),
  fragmentsFolder: Joi.string().required(),
  fragmentsTypes: Joi.array().items(fragmentsTypesSchema).required(),
  unreleasedFragmentsInclude: Joi.bool(),
  unreleasedFragmentsFolder: Joi.string(),
});

const changelogTemplate = `# [{{newVersion}}] - ({{bumpDate}})
{{#fragments}}
## {{title}}
{{#each fragmentEntries}}
* {{this}}
{{/each}}
{{/fragments}}
`;

const baseConfig = {
  changelogFile: "CHANGELOG.md",
  changelogDateFormat: "YYYY-MM-DD",
  changelogTemplate: changelogTemplate,
  fragmentsFolder: "fragments",
  fragmentsTypes: [
    { title: "Features", extension: "feature" },
    { title: "Bugfixes", extension: "bugfix" },
    { title: "Documentation", extension: "doc" },
    { title: "Deprecations and Removals", extension: "removal" },
    { title: "Misc", extension: "misc" },
  ],
  unreleasedFragmentsInclude: false,
  unreleasedFragmentsFolder: "unreleased",
};

const buildConfig = function (config) {
  const newsFragmentConfiguration = Object.assign({}, baseConfig, config);

  const { error } = schema.validate(newsFragmentConfiguration);

  if (error) {
    throw new Error(error.message);
  }

  return newsFragmentConfiguration;
};

const retrieveUserConfig = function (config, name) {
  return config.getContext(`plugins.${name}`) || null;
};

module.exports.retrieveUserConfig = retrieveUserConfig;
module.exports.buildConfig = buildConfig;
module.exports.newsFragmentsUserConfig = buildConfig(
  retrieveUserConfig(globalConfig, "@grupoboticario/news-fragments")
);
