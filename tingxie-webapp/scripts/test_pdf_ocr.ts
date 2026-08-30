import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { getGeminiClient } from '../lib/gemini';

dotenv.config();

export async function convertPdfToImages(pdfBufferOrPath: string | Buffer): Promise<string[]> {
  let tempPdfPath = typeof pdfBufferOrPath === 'string' ? pdfBufferOrPath : '';
  let createdTemp = false;

  if (typeof pdfBufferOrPath !== 'string') {
    tempPdfPath = path.join('/tmp', `pdf_upload_${Date.now()}.pdf`);
    fs.writeFileSync(tempPdfPath, pdfBufferOrPath);
    createdTemp = true;
  }

  try {
    const pythonCode = `
import pypdfium2 as pdfium
import base64, io, json, sys

pdf_path = sys.argv[1]
pdf = pdfium.PdfDocument(pdf_path)
pages = []
for page in pdf:
    image = page.render(scale=2).to_pil()
    buffered = io.BytesIO()
    image.save(buffered, format='PNG')
    pages.append(base64.b64encode(buffered.getvalue()).decode('utf-8'))

print(json.dumps(pages))
`;
    const pyScriptPath = path.join('/tmp', `render_pdf_${Date.now()}.py`);
    fs.writeFileSync(pyScriptPath, pythonCode);

    const pyExec = fs.existsSync('/tmp/pdfenv/bin/python3') ? '/tmp/pdfenv/bin/python3' : 'python3';
    const output = execSync(`${pyExec} "${pyScriptPath}" "${tempPdfPath}"`, {
      maxBuffer: 50 * 1024 * 1024
    }).toString();

    if (fs.existsSync(pyScriptPath)) fs.unlinkSync(pyScriptPath);
    if (createdTemp && fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);

    return JSON.parse(output);
  } catch (err) {
    if (createdTemp && fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
    throw err;
  }
}

async function testPdfOcr() {
  const pdfPath = '/Users/tylerh/Library/Mobile Documents/com~apple~CloudDocs/2026 4B 听写默写.pdf';
  console.log('Converting PDF pages to images using pdfium...');
  
  const pagesB64 = await convertPdfToImages(pdfPath);
  console.log(`Converted ${pagesB64.length} pages.`);

  const imageParts = pagesB64.map((b64Str: string) => ({
    inlineData: {
      data: b64Str,
      mimeType: 'image/png'
    }
  }));

  const prompt = `
你是一个专业的中文小学教材与听写试卷识别专家。
请仔细分析上传的这几张 Singapore 小学华文/中文听写默写表图片。

图片中包含了“听写（十）《课文名》”、“听写（十一）《课文名》”... 以及“默写（八）”、“默写（九）”等分组。

请把所有【听写】和【默写】项目提取出来，并格式化为标准的 JSON 格式返回。

规则要求：
1. 提取每一个听写或默写的编号和标题。例如：
   - 听写编号 10，标题："听写（十）《这样才对》"，类型："dictation" (听写)
   - 默写编号 108，标题："默写（八）"，类型："recitation" (默写)
2. 提取该分组下的所有条目（items/words）：
   - 对于【听写】：提取所有带编号的中文词语或短语（忽略拼音，只保留汉字），比如 ["不耐烦", "不肯借", "用力推开", ...]
   - 对于【默写】：提取所有带编号的完整句子/段落（忽略拼音，保留完整标点符号和汉字），比如 ["成绩公布时，我的心扑通扑通一直跳，紧张得差一点要跳出来似的。", ...]
3. grade 填 4，term 填 2，language 填 "zh"。
4. 编号 (number) 取听写/默写括号里的数字，如：听写（十）-> number: 10；默写（十一）-> number: 11。对于默写，比如默写（八），number 设为 108，默写（九）设为 109，避免与听写（八）重复。

输出 JSON 格式规范（必须是合法的纯 JSON 字符串）：
[
  {
    "number": 10,
    "type": "dictation",
    "title": "听写（十）《这样才对》",
    "grade": 4,
    "term": 2,
    "language": "zh",
    "items": [
      "不耐烦",
      "不肯借",
      "用力推开"
    ]
  },
  {
    "number": 108,
    "type": "recitation",
    "title": "默写（八）",
    "grade": 4,
    "term": 2,
    "language": "zh",
    "items": [
      "成绩公布时，我的心扑通扑通一直跳，紧张得差一点要跳出来似的。"
    ]
  }
]
`;

  console.log('Sending images to Gemini Flash for OCR extraction...');
  const response = await getGeminiClient().models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [
          {
              role: "user",
              parts: [
                  { text: prompt },
                  ...imageParts
              ]
          }
      ],
      config: { responseMimeType: "application/json" }
  });
  
  const responseText = response.text || "[]";
  
  console.log('--- Gemini Output ---');
  console.log(responseText);

  const parsed = JSON.parse(responseText);
  console.log(`Successfully parsed ${parsed.length} units!`);

  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'extracted_4b.json'), JSON.stringify(parsed, null, 2));
  console.log('Saved to data/extracted_4b.json');
}

if (require.main === module) {
  testPdfOcr().catch(console.error);
}
