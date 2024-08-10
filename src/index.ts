import { Element,Logger,Session,Context, Schema } from 'koishi'
//import {} from '@koishijs/plugin-console'

const m_path=require('path');

export const name = 'vit-nsfw-detect'

/*
export interface Cnfig {
  foo: string
  bar?: number
}

export const Cnfig: Schema<Cnfig> = Schema.object({
  foo: Schema.string().required(),
  bar: Schema.number().default(1),
})
*/

export interface Config {
//*
	savePicture: boolean
	pictureSavePath?: string
	recallNSFW: boolean
	nsfwScore: number
	modelPath: string
	hfMirrorURL
//*./
}

export const Config: Schema<Config> = Schema.intersect([
	Schema.object({
	savePicture: Schema.boolean()
				.required()
				.description("是否保存涩图"),
	}),
	Schema.union([Schema.object({
		savePicture: Schema.const(true).required().description("是否储存涩图"),
		pictureSavePath: Schema.path().default("data/vit-nsfw")
//					.required(),
	/*	｝）｝*/
	})//,Schema.object({})
	]),
	Schema.object({
	recallNSFW: Schema.boolean()
				.required()
				.description("是否反(尝试撤回)涩图"),
	nsfwScore: Schema.number()
				.max(1).min(0)
				.role('slider')
				.default(0.6)
				.step(0.05)
				.description("判定为涩图所需分数，越高越涩，不能非常靠近1"),
	modelPath: Schema.path()
				.default("vit-nsfw-models")
				.description("模型保存位置"),
	hfMirrorURL: Schema.string()
				.default("https://hf-mirror.com/")
				.description("Huging-Face 镜像源\n末尾带/")
	})
])
//*/
/* example import:
 * // npm i @xenova/transformers
 */
import type { ImageClassificationPipeline } from '@xenova/transformers';
export const inject = [ "notifier" ];
let pipeline, env;// = await import('@xenova/transformers');
let TRppl: ImageClassificationPipeline;
let logger=new Logger("vit-nsfw");
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
	let tmp = await import('@xenova/transformers');
	pipeline=tmp.pipeline; env=tmp.env;
	env.remoteHost="https://hf-mirror.com/"; // TODO: Schema Mirror Replace
	env.localModelPath=m_path.join(ctx.baseDir,"vit-nsfw-models"); // TODO Schema dir picking
	logger.info("Downloading/Loading model...");
	await try_create_ppl(pipeline);
	logger.info("Loading Done with no error.");
}
async function parse_image(_:Session,it:Element,sccfg:Config){
	// console.log(it.attrs,it.data);
	const stime=new Date().getTime();
	let cls_res;
	while(true)try{cls_res=await TRppl([it.data.src]);break}catch(e:any){}
	const tim=new Date().getTime()-stime;
	console.log(cls_res);
	_.sendQueued(cls_res.toString()+"took"+tim.toString()+"s");
}
async function plugin_init(ctx: Context,cfg:Config) {
	try{await load_trans(ctx);}
	catch(e:any){
		logger.error(e);
		logger.error("Failed to get model.");
		logger.warn("Please check your network and re-enable this plugin :>");
		ctx.scope.dispose();
		return;
	}
	await ctx.middleware(async (_:Session,next)=>{
		_.event.message.elements.forEach(async (it:Element)=>{
			console.log(it.type);
			if(it.type=="img"){
				// Not using await to avoid msg hang
				parse_image(_,it,cfg);
			}
		});
		// a$(_(()"))
		return next();
	});
}
export async function apply(c:Context,cfg:Config){
	const plg_fr=await c.plugin(plugin_init,cfg);
	// ctx.page()
	/*c.inject(['console'], (ctx) => {
	ctx.console.addEntry({
		dev: m_path.resolve(__dirname, '../client/index.ts'),
		prod: m_path.resolve(__dirname, '../dist'),
		})
	});*/
}
