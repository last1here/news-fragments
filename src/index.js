const {
  generateTemplateData,
  renderTemplate,
  saveChangelogToFile,
} = require("./build-template");
const { newsFragmentsUserConfig } = require("./config");
const { deleteFragmentsFiles, moveFilesToFragmentsFolder } = require("./file");
const { checkChangelogFile, checkFragmentsFolder } = require("./helpers");
const {
  getFragmentsFilesByFragmentType,
  getFragmentsContent,
} = require("./file");
const { Plugin } = require("release-it");
const path = require("path");

const prompts = {
  publish: {
    type: "confirm",
    message: (context) =>
      `Publish ${context["news-fragments"].unreleasedFragmentCount} unreleased changelog entries?`,
    default: false,
  },
  build: {
    type: "confirm",
    message: () => `Build changelog?`,
    default: true,
  },
};

class NewsFragments extends Plugin {
  constructor(...args) {
    super(...args);
    this.registerPrompts(prompts);
  }

  init() {
    this.setContext(newsFragmentsUserConfig);

    checkChangelogFile(this.context.changelogFile);
    checkFragmentsFolder(this.context.fragmentsFolder);

    this.getUnreleasedCount();
  }

  getUnreleasedCount() {
    const unreleasedFragmentCount = this.context.fragmentsTypes
      .map((fragmentType) => {
        return getFragmentsFilesByFragmentType(
          path.join(
            this.context.fragmentsFolder,
            this.context.unreleasedFragmentsFolder
          ),
          fragmentType.extension
        ).length;
      })
      .reduce((a, b) => a + b, 0);

    this.setContext({
      unreleasedFragmentCount: unreleasedFragmentCount,
    });
  }

  async release() {
    const {
      unreleasedFragmentCount,
      unreleasedFragmentsInclude,
      version,
    } = this.getContext();

    await this.step({
      enabled: unreleasedFragmentCount > 0 && !unreleasedFragmentsInclude,
      task: () => this.moveUnreleased(),
      label: "Include unreleased",
      prompt: "publish",
    });

    this.buildChangelog(version);
  }

  moveUnreleased() {
    this.setContext({
      unreleasedFragmentsInclude: true,
    });
  }

  buildChangelog(version) {
    const { unreleasedFragmentsInclude } = this.getContext();
    let fragmentsToBurn = [];
    let fragmentsToDelete = [];

    this.context.fragmentsTypes.forEach((fragmentType) => {
      const fragmentsEncountered = getFragmentsFilesByFragmentType(
        this.context.fragmentsFolder,
        fragmentType.extension
      );

      if (unreleasedFragmentsInclude) {
        const unreleasedfragments = getFragmentsFilesByFragmentType(
          path.join(
            this.context.fragmentsFolder,
            this.context.unreleasedFragmentsFolder
          ),
          fragmentType.extension
        );
        fragmentsEncountered.push(...unreleasedfragments);
      }

      fragmentsToDelete.push(...fragmentsEncountered);

      const fragmentEntries = getFragmentsContent(fragmentsEncountered);

      if (fragmentEntries.length > 0) {
        fragmentsToBurn.push({
          title: fragmentType.title,
          fragmentEntries,
        });
      }
    });

    this.log.info(`Publishing ${fragmentsToDelete.length} changelog entries.`);

    const templateData = generateTemplateData(
      version,
      this.context.changelogDateFormat,
      fragmentsToBurn
    );
    const renderedTemplate = renderTemplate(
      this.context.changelogTemplate,
      templateData
    );
    saveChangelogToFile(this.context.changelogFile, renderedTemplate);
    deleteFragmentsFiles(fragmentsToDelete);
  }

  bump(version) {
    this.setContext({
      version,
    });
  }
}

module.exports = NewsFragments;
