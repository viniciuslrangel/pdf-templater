# PDF Templater

`pdf-templater` does the same as [docxtemplater](https://github.com/open-xml-templating/docxtemplater/) but for PDF. It uses [pdf-lib](https://github.com/Hopding/pdf-lib) as parser/generator.

Works in any environment: Node, Browser, React Native

## Example

Read [how to load pdf](https://github.com/Hopding/pdf-lib#modify-document) from pdf-lib

```JavaScript
import { PDFDocument } from 'pdf-lib'
import templatePDF from 'pdf-templater'

const doc = await PDFDocument.load(/* existing pdf array buffer */)
templatePDF(doc, {
    ['entry', 'value'],                         // Replaces all `{entry}` matches to `value`
    [/^A.*/, 'a line'],                         // Replaces all lines starting with A to `a line`
    [/^A.*/, (match) => match[0].substring(1)]  // Replacement value can be a function that receives each match
})
const outputBase64 = doc.saveAsBase64() // Save the doc already replacement
// ....
```

This can throw an error in multiple cases, wrap it inside a try..catch.

_Recommended_: validate your pdf with some pdf inspector and make sure the matches are in the same text block. Editors usually split text (even in the same line) into multiple text blocks, which will not be caught by your full regex


> **Tip**: font glyphs must be already available in the pdf file. If it is not there, write all letters you will use as invisible (white, with the same font and the smallest size) hidden somewhere.
