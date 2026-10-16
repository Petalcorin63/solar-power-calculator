// Lets tools that don't understand Vue files (ESLint's type-aware rules, reading
// main.ts) type `import X from './X.vue'` as a component. vue-tsc resolves real .vue
// files first, so this doesn't loosen the build's type check.
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}
