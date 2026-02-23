



// Response type from Cloud Vision API
interface CloudVisionResponse {
    responses: {
        fullTextAnnotation?: {
            text: string;
        };
        error?: {
            code: number;
            message: string;
        };
    }[];
}

export async function recognizeHandwriting(base64Image: string): Promise<string> {
    // Remove header if present (e.g., "data:image/png;base64,")
    const base64Content = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        throw new Error("Missing Google API Key (GOOGLE_CLOUD_VISION_API_KEY or GOOGLE_API_KEY)");
    }

    const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

    const requestBody = {
        requests: [
            {
                image: {
                    content: base64Content
                },
                features: [
                    {
                        type: "DOCUMENT_TEXT_DETECTION", // Optimized for dense text/handwriting
                        maxResults: 1
                    }
                ],
                imageContext: {
                    languageHints: ["zh-CN", "en"] // Hint for Chinese and English
                }
            }
        ]
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloud Vision API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as CloudVisionResponse;
    const annotation = data.responses[0];

    if (annotation.error) {
        throw new Error(`Cloud Vision API error: ${annotation.error.message}`);
    }

    return annotation.fullTextAnnotation?.text || "";
}

export function compareHandwriting(recognized: string, expected: string): boolean {
    if (!recognized || !expected) return false;

    // Normalize: remove punctuation, whitespace, and convert to lowercase (for English)
    // For Chinese, we usually want to ignore spaces.
    const clean = (str: string) => str.replace(/[^\w\u4e00-\u9fa5]/g, "").toLowerCase();

    return clean(recognized) === clean(expected);
}
