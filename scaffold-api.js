const fs = require('fs');
const path = require('path');

const modules = [
  'auth', 'users', 'shifts', 'assignments', 'swaps', 'notifications', 'audit'
];

const basePath = path.join(__dirname, 'apps/api/src');

modules.forEach(mod => {
  const modPath = path.join(basePath, mod);
  if (!fs.existsSync(modPath)) fs.mkdirSync(modPath, { recursive: true });

  const capitalized = mod.charAt(0).toUpperCase() + mod.slice(1);

  // Module
  fs.writeFileSync(path.join(modPath, `${mod}.module.ts`), `import { Module } from '@nestjs/common';
import { ${capitalized}Controller } from './${mod}.controller';
import { ${capitalized}Service } from './${mod}.service';

@Module({
  controllers: [${capitalized}Controller],
  providers: [${capitalized}Service],
  exports: [${capitalized}Service],
})
export class ${capitalized}Module {}
`);

  // Controller
  fs.writeFileSync(path.join(modPath, `${mod}.controller.ts`), `import { Controller } from '@nestjs/common';
import { ${capitalized}Service } from './${mod}.service';

@Controller('${mod}')
export class ${capitalized}Controller {
  constructor(private readonly ${mod}Service: ${capitalized}Service) {}
}
`);

  // Service
  fs.writeFileSync(path.join(modPath, `${mod}.service.ts`), `import { Injectable } from '@nestjs/common';

@Injectable()
export class ${capitalized}Service {}
`);
});

// Update AppModule
const appModulePath = path.join(basePath, 'app.module.ts');
let appModule = fs.readFileSync(appModulePath, 'utf8');

const imports = modules.map(mod => {
  const cap = mod.charAt(0).toUpperCase() + mod.slice(1);
  return `import { ${cap}Module } from './${mod}/${mod}.module';`;
}).join('\n');

const moduleRefs = modules.map(mod => `${mod.charAt(0).toUpperCase() + mod.slice(1)}Module`).join(', ');

appModule = appModule.replace("import { PrismaModule } from './prisma/prisma.module';", `import { PrismaModule } from './prisma/prisma.module';\n${imports}`);
appModule = appModule.replace("imports: [PrismaModule]", `imports: [PrismaModule, ${moduleRefs}]`);

fs.writeFileSync(appModulePath, appModule);
console.log('Scaffold complete');
