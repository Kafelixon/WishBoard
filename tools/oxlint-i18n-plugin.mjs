// User-facing text goes through react-i18next (src/locales/*.json), never JSX literals.
const message = 'Hardcoded UI text. Use t("…") from react-i18next.';

export default {
  meta: { name: "i18n" },
  rules: {
    "no-literal-ui-text": {
      create(context) {
        return {
          "JSXText[value=/[\\p{L}\\p{N}]/u]"(node) {
            context.report({ node, message });
          },
          "JSXAttribute[name.name=/^(aria-label|aria-description|alt|placeholder|title)$/] > Literal[value=/[\\p{L}]/u]"(node) {
            context.report({ node, message });
          },
        };
      },
    },
  },
};
