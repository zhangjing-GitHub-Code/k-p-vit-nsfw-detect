import { Element,Logger,Session,Context, Schema } from 'koishi'
import type { Notifier } from '@koishijs/plugin-notifier'
import { } from '@koishijs/plugin-notifier'
//import { floor } from 'node:math';
//import {} from '@koishijs/plugin-console'

//const path=require('path');
//const m_fs=require('fs');
import * as fs from 'fs';
import * as path from 'path';

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
//*
	recallNSFW: boolean
	nsfwScore: number
	modelPath: string
	hfMirrorURL: string
//*/
}

export const Config: Schema<Config> = Schema.intersect([
	Schema.object({
		savePicture: Schema.boolean()
					.default(false) // .required()
					.description("是否保存涩图"),
	}),
	Schema.union([
		Schema.object({
			savePicture: Schema.const(true).required(), //.description("是否储存涩图"),
			pictureSavePath: Schema.path().default("data/vit-nsfw")
//						.required(),
	/*	｝）｝*/
		}),
		Schema.object({})
	]),
///*
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
					.default("data/vit-nsfw-models")
					.description("模型保存位置"),
		hfMirrorURL: Schema.string()
					.default("https://hf-mirror.com/")
					.description("Huging-Face 镜像源\n末尾带/")
	})
// */
]) as any;
//*/
/* example import:
 * // npm i @xenova/transformers
 */
import type { ImageClassificationPipeline } from '@xenova/transformers';
import { } from '@xenova/transformers';
export const inject = [ "notifier" ];
//let tr = import('@xenova/transformers');
let pipeline,env,pause=true;
import('@xenova/transformers').then((imp)=>{pause=false;pipeline=imp.pipeline;;env=imp.env;});

// let pipeline=tr.pipeline,env=tr.env;
let TRppl: ImageClassificationPipeline;
let plgcnt:number=0;
let logger=new Logger("vit-nsfw");
let ntfy: Notifier;
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function mp_str(src:string,n:number){
	n=Math.floor(n);
	let res:string="";
	while(n--){res+=src;}
	return res;

}
async function try_create_ppl(ppl_con){
	ntfy.update({content:"加载/下载模型中",type:"primary"});
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
			ntfy.update({content:"加载模型中"+await mp_str('.',fail/2),type:"primary"});
			if(fail>20){``
				logger.error("Failed to download model in 20times");
				throw(e);
			}
		}
	}

}
async function checkDir(_:Context,pth:string){
	try{
		await fs.mkdir(pth,{recursive:true},(err:Error,realpath:string)=>{
			if(err){
				logger.error("Failed to create the final model path `"
					+realpath+"`,please check the permission ")
				_.scope.dispose();
			}
		});
	}catch(e:any){// );// */
		ntfy.update({content:"modelPath 有问题，请检查权限或输入正确目录",type:"danger"});
		logger.error("Failed Checking "+pth+",please check permission.");
		_.scope.dispose();
	}

}
async function load_trans(ctx: Context,cfg: Config){
	// let tmp = await import('@xenova/transformers');
	// pipeline=tmp.pipeline; env=tmp.env;
	env.remoteHost=cfg.hfMirrorURL; // TODO: Schema Mirror Replace
	env.localModelPath=path.join(ctx.baseDir,cfg.modelPath); // TODO Schema dir picking
	env.cacheDir=env.localModelPath;
	logger.info("Checking model path "+env.localModelPath+" ...");
	ntfy.update({content:"检测目录中",type:"primary"});
	await checkDir(ctx,env.localModelPath);
	logger.info("Downloading/Loading model...");
	await try_create_ppl(pipeline);
	logger.info("Loading Done with no error.");
		ntfy.update({content:"加载成功！",type:"success"});
}
async function parse_msg(_:Session,ctx:Context,sccfg:Config){
	_.event.message.elements.forEach(async (it:Element)=>{
		// console.log(it.type);
		if(it.type=="img"){
			logger.debug("parsing img "+it.data.src/*.slice(4,20)*/);
			// Not using await to avoid msg hang
//			parse_image(_,it,cfg);
			// console.log(it.attrs,it.data);
			const stime=new Date().getTime();
			let cls_res;
			while(true)try{cls_res=await TRppl([it.data.src]);break}catch(e:any){}
			const tim=new Date().getTime()-stime;
			logger.debug(cls_res,tim);
			if((
				cls_res.label!='sfw'
				&&cls_res.score>=sccfg.nsfwScore
			) || (
				cls_res.label=='sfw'
				&&cls_res.score<=1-sccfg.nsfwScore
			)){ // NSFW JUDGED
				if(sccfg.savePicture){
				// TODO: Save logic
				}
				if(sccfg.recallNSFW){
					//
					await _.bot.deleteMessage(_.channelId,_.messageId);

				}
			}
			// _.sendQueued(cls_res.toString()+"took"+tim.toString()+"s");
		}
	});
}
async function plugin_init(ctx: Context,cfg:Config) {
	ntfy=await ctx.notifier.create();
	ntfy.update("启动插件...");
	++plgcnt;
	if(!TRppl){
	try{await load_trans(ctx,cfg);}
	catch(e:any){
		ntfy.update({content:"模型加载失败！请查看日志",type:"danger"});
		logger.error(e);
		logger.error("Failed to get model.");
		logger.warn("Please check your network and re-enable this plugin :>");
		ctx.scope.dispose();
		return;
	}
	}else{
		ntfy.update("已加载过模型，启动成功");
	}
	await ctx.on("dispose",()=>{
		logger.debug("dispoing vit with plgcnt ",plgcnt);
		--plgcnt;
		if(!plgcnt){
			TRppl.dispose();
			TRppl=undefined;
			ntfy.dispose();
		}
	});
	await ctx.middleware(async (_:Session,next)=>{
		parse_msg(_,ctx,cfg);
		// a$(_(()"))
		return next();
	},true); // pre-mdwr
	// ntfy.clearActions
	ctx.setTimeout(async()=>{await ntfy.dispose();},1500);
}
export async function apply(c:Context,cfg:Config){
	while(pause)await sleep(100);
	const plg_fr=await c.plugin(plugin_init,cfg);
}
