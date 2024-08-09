import { Element,Logger,Session,Context, Schema } from 'koishi'

const m_path=require('path');

export const name = 'vit-nsfw-detect'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})
/* example import:
 * // npm i @xenova/transformers
import { pipeline } from '@xenova/transformers';

// Allocate pipeline
// const pipe = await pipeline('image-classification', 'AdamCodd/vit-base-nsfw-detector');
*/
import type { ImageClassificationPipeline } from '@xenova/transformers';
let TRppl: ImageClassificationPipeline;
let logger=new Logger("vit-nsfw");
let needExit=false;
async function try_create_ppl(ppl_con){
	let fail=0;
	while(true){
		try{
			TRppl = await ppl_con(
			'image-classification',
			'AdamCodd/vit-base-nsfw-detector'
			);
			return;
		}catch(e:any){
			++fail;
			if(fail>20){
				logger.error("Failed to download model in 20times");
				throw(e);
			}
		}
	}

}
async function load_trans(ctx: Context){
	// Dynamic Import Zone ====
	let { pipeline, env } = await import('@xenova/transformers');
	env.remoteHost="https://hf-mirror.com/"; // TODO: Schema Mirror Replace
	env.localModelPath=m_path.join(ctx.baseDir,"vit-nsfw-models"); // TODO Schema dir picking
	//console.log(ctx.baseDir);
	logger.info("Downloading/Loading model...");
	await try_create_ppl(pipeline);
	// Import Foreign END ======
	logger.info("Loading Done with no error.");
}
async function plugin_init(ctx: Context) {
	try{await load_trans(ctx);}
	catch(e:any){
		logger.error(e);
		logger.error("Failed to get model.");
		logger.warn("Please check your network and re-enable this plugin :>");
		//ctx.;
		ctx.scope.dispose();
		//needExit=true;
		return;
	}
	await ctx.middleware((_:Session,next)=>{
		_.event.message.elements.forEach(async (it:Element)=>{
			console.log(it.type);
			if(it.type=="img"){
				console.log(it.attrs,it.data);
				const stime=new Date().getTime();
				let cls_res;
				while(true)try{cls_res=await TRppl([it.data.src]);break}catch(e:any){}
				const tim=new Date().getTime()-stime;
				console.log(cls_res);
				_.sendQueued(cls_res.toString()+"took"+tim.toString()+"s");
			}
		});
		// a$(_(()"))
		return next();
	});
}
export async function apply(c:Context,cfg:Config){
	const plg_fr=await c.plugin(plugin_init,cfg);
	/* useless if(needExit){
		needExit=false;
		plg_fr.dispose();
		logger.warn("Please check your network and re-enable this plugin :>");
	}*/
}
