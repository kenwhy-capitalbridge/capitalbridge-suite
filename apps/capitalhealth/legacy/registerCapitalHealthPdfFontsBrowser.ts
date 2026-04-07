// STANDARD: TEMPORARY WAIVER — migrate to PdfLayout pipeline
import { Font } from "@react-pdf/renderer";
import { registerCapitalHealthPdfHyphenation } from "./capitalHealthPdfFontHyphenation";

let registered = false;

/** Google Fonts URLs — used in the browser and when Node cannot read bundled TTFs. */
export function registerCapitalHealthPdfFontsForBrowser(): void {
  if (registered) return;
  registered = true;
  registerCapitalHealthPdfHyphenation();

  Font.register({
    family: "Roboto Serif",
    fonts: [
      {
        src: "https://fonts.gstatic.com/s/robotoserif/v17/R71RjywflP6FLr3gZx7K8UyuXDs9zVwDmXCb8lxYgmuii32UGoVldX6UgfjL4-3sMM_kB_qXSEXTJQCFLH5-_bcElvQqp6c.ttf",
        fontWeight: 600,
      },
      {
        src: "https://fonts.gstatic.com/s/robotoserif/v17/R71RjywflP6FLr3gZx7K8UyuXDs9zVwDmXCb8lxYgmuii32UGoVldX6UgfjL4-3sMM_kB_qXSEXTJQCFLH5-_bcEls0qp6c.ttf",
        fontWeight: 700,
      },
      {
        src: "https://fonts.gstatic.com/s/robotoserif/v17/R71XjywflP6FLr3gZx7K8UyEVQnyR1E7VN-f51xYuGCQepOvB0KLc2v0wKKB0Q4MSZxyqf2CgAchbDJ69BcVZxkDg-JuqON8BQ.ttf",
        fontWeight: 700,
        fontStyle: "italic",
      },
    ],
  });

  Font.register({
    family: "Inter",
    fonts: [
      {
        src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZg.ttf",
        fontWeight: 400,
      },
      {
        src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZg.ttf",
        fontWeight: 700,
      },
    ],
  });
}
