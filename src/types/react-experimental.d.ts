import type { ViewTransition } from "react";

declare module "react" {
  /** Con `experimental.viewTransition`, Next empaqueta el canal experimental
   *  de React para el App Router, donde el componente aún lleva prefijo. */
  export const unstable_ViewTransition: typeof ViewTransition;
}
