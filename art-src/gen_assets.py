"""用 Codex 批量生成 PROMPTS.md 里的全部贴图。

用法：python3 gen_assets.py [--jobs 4] [--only afei_run,wheel]
已存在的图片会跳过；失败的会重试一次。图片保存在 art-src/gen/。
"""
import argparse
import re
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / 'gen'
LOG = HERE / 'gen.log'
MODEL = 'gpt-6.1-sol'
EFFORT = 'medium'

ACTION = {
    'run': '动作：向右奔跑，一条腿向前迈出、一条腿向后蹬，双臂前后摆动，头发和衣角向后飘。',
    'ride': ('动作：坐姿（骑乘姿势），不是奔跑也不是走路。身体直立略微前倾，大腿保持水平向前伸出、膝盖弯成直角、小腿自然垂下，'
             '就像正稳稳坐在一匹马的马鞍上；双手在身前握着缰绳。双脚悬空不着地。画面中没有坐骑、马鞍或座椅，只有人物本身。'),
}


def parse_prompts():
    text = (HERE / 'PROMPTS.md').read_text(encoding='utf-8')
    styles = {}
    for kind in ('角色', '坐骑', '宠物'):
        m = re.search(r'### ' + kind + r'.*?\n```\n(.*?)```', text, re.S)
        styles[kind] = m.group(1).strip()
    jobs = []
    section = None
    for line in text.splitlines():
        if line.startswith('## 角色'):
            section = '角色'
        elif line.startswith('## 坐骑'):
            section = '坐骑'
        elif line.startswith('## 宠物'):
            section = '宠物'
        elif line.startswith('## '):
            section = None
        if not section or not line.startswith('| `'):
            continue
        cells = [c.strip() for c in line.strip('|').split('|')]
        names = re.findall(r'`([a-z0-9_]+)`', cells[0])
        desc = cells[1]
        for n in names:
            parts = [styles[section], desc]
            if section == '角色':
                parts.append(ACTION[n.rsplit('_', 1)[1]])
            jobs.append((n, '\n'.join(parts)))
    return jobs


def run_one(name, prompt):
    target = OUT / f'{name}.png'
    if target.exists():
        return name, 'skip'
    instruction = (
        f'Use your image generation tool to create exactly ONE image from the description below and save it as {target}. '
        'Prefer a transparent background. Do not create or modify any other files. When done, print only the file path.\n\n'
        + prompt
    )
    for attempt in (1, 2):
        t0 = time.time()
        p = subprocess.run(
            ['codex', 'exec', '--skip-git-repo-check', '-s', 'workspace-write', '-m', MODEL,
             '-c', f'model_reasoning_effort="{EFFORT}"', '-C', str(OUT), instruction],
            capture_output=True, text=True, timeout=900)
        ok = target.exists()
        with LOG.open('a', encoding='utf-8') as f:
            f.write(f'{time.strftime("%H:%M:%S")} {name} try{attempt} {"OK" if ok else "FAIL"} {time.time() - t0:.0f}s\n')
            if not ok:
                f.write((p.stdout + p.stderr)[-1500:] + '\n')
        if ok:
            return name, 'ok'
    return name, 'fail'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--jobs', type=int, default=4)
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    OUT.mkdir(exist_ok=True)
    jobs = parse_prompts()
    if a.only:
        keep = set(a.only.split(','))
        jobs = [j for j in jobs if j[0] in keep]
    print(f'{len(jobs)} images, model {MODEL} ({EFFORT}), {a.jobs} at a time', flush=True)
    done = 0
    with ThreadPoolExecutor(a.jobs) as ex:
        for name, status in ex.map(lambda j: run_one(*j), jobs):
            done += 1
            print(f'[{done}/{len(jobs)}] {name}: {status}', flush=True)
    fails = [n for n, _ in jobs if not (OUT / f'{n}.png').exists()]
    print('failed:', ', '.join(fails) if fails else 'none', flush=True)


if __name__ == '__main__':
    sys.exit(main())
