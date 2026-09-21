(() => {
        const colors = { dark: "#0a0a0b", light: "#fafaf8" };
        let theme = "light";
        try {
          const stored = localStorage.getItem("theme");
          if (stored === "dark" || stored === "light") theme = stored;
        } catch (error) {}
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.backgroundColor = colors[theme];
        document.documentElement.style.colorScheme = theme;
        document.querySelector('meta[name="color-scheme"]').setAttribute("content", theme);
        document.querySelector('meta[name="theme-color"]').setAttribute("content", colors[theme]);
      })();
