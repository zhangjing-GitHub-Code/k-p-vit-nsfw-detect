import { Element,Session,Context, Schema } from 'koishi'

export const name = 'vit-nsfw-detect'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})
/* example import:
 * // npm i @xenova/transformers
import { pipeline } from '@xenova/transformers';

// Allocate pipeline
// const pipe = await pipeline('image-classification', 'AdamCodd/vit-base-nsfw-detector');
*/
import type { ImageClassificationPipeline} from '@xenova/transformers';
// let TRppl: ImageClassificationPipeline;
export async function apply(ctx: Context) {
	let { pipeline,env } = await import('@xenova/transformers');
	env.remoteHost="https://hf-mirror.com"; // TODO: Schema Mirror Replace
	let TRppl = await pipeline('image-classification', 'AdamCodd/vit-base-nsfw-detector');
	ctx.middleware((_:Session,next)=>{
		_.event.message.elements.forEach((it:Element)=>{
			console.log(it.type);
		});
		// a$(_(()"))
		return next();
	});
}
