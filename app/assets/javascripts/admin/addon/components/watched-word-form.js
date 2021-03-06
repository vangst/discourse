import discourseComputed, {
  observes,
  on,
} from "discourse-common/utils/decorators";
import Component from "@ember/component";
import I18n from "I18n";
import WatchedWord from "admin/models/watched-word";
import bootbox from "bootbox";
import { isEmpty } from "@ember/utils";
import { schedule } from "@ember/runloop";

export default Component.extend({
  classNames: ["watched-word-form"],
  formSubmitted: false,
  actionKey: null,
  showMessage: false,

  @discourseComputed("actionKey")
  canReplace(actionKey) {
    return actionKey === "replace";
  },

  @discourseComputed("regularExpressions")
  placeholderKey(regularExpressions) {
    return (
      "admin.watched_words.form.placeholder" +
      (regularExpressions ? "_regexp" : "")
    );
  },

  @observes("word")
  removeMessage() {
    if (this.showMessage && !isEmpty(this.word)) {
      this.set("showMessage", false);
    }
  },

  @discourseComputed("word")
  isUniqueWord(word) {
    const words = this.filteredContent || [];
    const filtered = words.filter(
      (content) => content.action === this.actionKey
    );
    return filtered.every(
      (content) => content.word.toLowerCase() !== word.toLowerCase()
    );
  },

  actions: {
    submit() {
      if (!this.isUniqueWord) {
        this.setProperties({
          showMessage: true,
          message: I18n.t("admin.watched_words.form.exists"),
        });
        return;
      }

      if (!this.formSubmitted) {
        this.set("formSubmitted", true);

        const watchedWord = WatchedWord.create({
          word: this.word,
          replacement: this.canReplace ? this.replacement : null,
          action: this.actionKey,
        });

        watchedWord
          .save()
          .then((result) => {
            this.setProperties({
              word: "",
              replacement: "",
              formSubmitted: false,
              showMessage: true,
              message: I18n.t("admin.watched_words.form.success"),
            });
            this.action(WatchedWord.create(result));
            schedule("afterRender", () =>
              this.element.querySelector(".watched-word-input").focus()
            );
          })
          .catch((e) => {
            this.set("formSubmitted", false);
            const msg =
              e.jqXHR.responseJSON && e.jqXHR.responseJSON.errors
                ? I18n.t("generic_error_with_reason", {
                    error: e.jqXHR.responseJSON.errors.join(". "),
                  })
                : I18n.t("generic_error");
            bootbox.alert(msg, () =>
              this.element.querySelector(".watched-word-input").focus()
            );
          });
      }
    },
  },

  @on("didInsertElement")
  _init() {
    schedule("afterRender", () => {
      $(this.element.querySelector(".watched-word-input")).keydown((e) => {
        if (e.keyCode === 13) {
          this.send("submit");
        }
      });
    });
  },
});
