import {
  useEffect,
  useState,
} from "react";

import {
  LEGACY_PRODUCT_MENU,
  loadDynamicProductMenu,
  ProductMenuCategory,
  ProductMenuLoadMode,
} from "../config/productMenuConfig";

const cloneMenu = (
  source:
    ProductMenuCategory[]
): ProductMenuCategory[] =>
  source.map(
    (category) => ({
      ...category,
      groups:
        category.groups.map(
          (group) => ({
            ...group,
            items:
              group.items.map(
                (item) => ({
                  ...item,
                })
              ),
          })
        ),
    })
  );

/*
 * Dynamic loader có fallback legacy.
 *
 * Component chỉ cần:
 *
 * const productMenu =
 *   useDynamicProductMenu("public");
 *
 * hoặc:
 *
 * const productMenu =
 *   useDynamicProductMenu("admin");
 */
export const useDynamicProductMenu = (
  mode:
    ProductMenuLoadMode =
    "public"
) => {
  const [
    menu,
    setMenu,
  ] =
    useState<
      ProductMenuCategory[]
    >(
      () =>
        cloneMenu(
          LEGACY_PRODUCT_MENU
        )
    );

  useEffect(() => {
    let mounted =
      true;

    loadDynamicProductMenu(
      mode
    )
      .then(
        (loadedMenu) => {
          if (!mounted) {
            return;
          }

          setMenu(
            cloneMenu(
              loadedMenu
            )
          );
        }
      )
      .catch(() => {
        /*
         * Không throw lên UI.
         * Menu legacy vẫn hoạt động.
         */
        if (mounted) {
          setMenu(
            cloneMenu(
              LEGACY_PRODUCT_MENU
            )
          );
        }
      });

    return () => {
      mounted =
        false;
    };
  }, [mode]);

  return menu;
};

export default useDynamicProductMenu;
