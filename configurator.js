const fs = require('node:fs/promises');
const yaml = require('yaml');
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const argv = yargs(hideBin(process.argv))
  .command('create [app]', 'start the server', (yargs) => {
    return yargs
      .positional('app', {
        describe: 'app name',
      })
  }, (argv) => {
    create(
      argv.app,
      argv.appPath ? argv.appPath : `./../${argv.app}`,
      argv.playbooksPath ? argv.playbooksPath : `./../ansible/volume/playbooks`,
      argv.confPath ? argv.confPath : `./../ansible/volume/conf`,
      argv.forceHttp ? argv.forceHttp : false,
    );
  })
  .option('app-path', {
    alias: 'p',
    type: 'string',
    description: 'The app path - defaults to ./../[app]'
  })
  .option('playbooks-path', {
    alias: 'n',
    type: 'string',
    description: 'The playbooks path - defaults to ./../ansible/volume/playbooks'
  })
  .option('conf-path', {
    alias: 'c',
    type: 'string',
    description: 'The conf path - defaults to ./../ansible/volume/conf'
  })
  .option('force-http', {
    alias: 't',
    type: 'boolean',
    description: 'Force all the URLs to be with an http:// scheme'
  })
  .parse();

async function create(app, appPath, playbooksPath, confPath, forceHttp) {
  const chalk = new (await import("chalk")).Chalk();

  console.log(chalk.bgBlueBright(`Writing configuration of ${app}`));
  console.log({ app, appPath, playbooksPath, confPath, forceHttp });
  console.log(` `);

  let playbook,
      inventory,
      conf;

  console.log(`Delete ${appPath}/.env`);
  try {
    await fs.unlink(`${appPath}/.env`);
    console.log(chalk.green(`✔️   Config deleted`));
  } catch(e) {
    console.log(chalk.yellow(`⚠️   Cannot delete base env file - does the file exist?`));
  }
  console.log(` `);

  console.log(`Fetching playbook in ${playbooksPath}/deploy-${app}.yaml`);
  try {
    const playbookRaw = (await fs.readFile(`${playbooksPath}/deploy-${app}.yaml`)).toString();
    playbook = yaml.parse(playbookRaw);
    console.log(chalk.green(`✔️   Playbook fetched`));
  } catch(e) {
    console.log(chalk.yellow(`💔   Cannot fetch playbook`));
    console.log(e);
    process.exit(1);
  }
  console.log(` `);

  console.log(`Fetching inventory in ${confPath}/inventory.yaml`);
  try {
    const inventoryRaw = (await fs.readFile(`${confPath}/inventory.yaml`)).toString();
    inventory = yaml.parse(inventoryRaw);
    console.log(chalk.green(`✔️   Config fetched`));
  } catch(e) {
    console.log(chalk.yellow(`💔   Cannot fetch base config`));
    console.log(e);
    process.exit(1);
  }
  console.log(` `);

  console.log(`Generating conf`);
  try {
    conf = {};
    for (let key in playbook[0].roles[0].docker_env) {
      let value = await getValueFromInventory(inventory, playbook[0].roles[0].docker_env[key], confPath);
      if (forceHttp) {
        value = value.replace(/^https:\/\//g, 'http://');
      }
      conf[key] = value;
      console.log(chalk.white(`✨   Value for ${key} is ${value}`));
    }
    console.log(chalk.green(`✔️   Conf generated`));
  } catch(e) {
    console.log(chalk.yellow(`💔   Conf cannot be generated`));
    console.log(e);
    process.exit(1);
  }
  console.log(` `);

  console.log(`Writing conf`);
  try {
    const env = Object.entries(conf).map(
      ([key, value]) => `${key}: "${value}"`
    ).join('\n');
    await fs.writeFile(`${appPath}/.env`, env);
    console.log(chalk.green(`✔️   Conf wrote`));
  } catch(e) {
    console.log(chalk.yellow(`💔   Conf cannot be written`));
    console.log(e);
    process.exit(1);
  }
  console.log(` `);

  console.log(chalk.bgGreenBright(`Configuration of ${app} written under ${appPath}/.env`));
}

async function getValueFromInventory(inventory, input, basePath) {
  for (let hostName in inventory.apps.hosts) {
    const host = inventory.apps.hosts[hostName];
    for (let confKey in host) {
      if (input.match(/{{ lookup\('file', '[a-zA-Z\/\-.]*'\) }}/g)) {
        const path = input.replace(`{{ lookup('file', '`, '').replace(`') }}`, '').replace('/volume/', '/');
        return (await fs.readFile(basePath + '/../' + path)).toString();
      } else {
        input = input.replace(' | int', '').replace(new RegExp(`\{\{ ${confKey} \}\}`, 'g'), host[confKey]);
      }
    }
  }
  return input;
}
