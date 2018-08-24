# JSLoader

JSLoader is an browser extension developed for Firefox. Its goal is to give to the user the ability to store scripts for any page allowing them to run. Those scripts will be executed against page content everytime the user visit the target site. The extension is distributed in AMO and can be found as ususal, those using this repository will receive an unsigned version of the extension.


### Prerequisites

To enjoy all the functionality the extension offers an instance of mongodb and python must be installed in the machine. For ubuntu or debian based distros:

- MongoDB:

```
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4

```
Now depending on your distro you must add the mongo db repositories in [sources lists](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/#create-a-list-file-for-mongodb)

And install the latest version of MongoDB:

```
sudo apt-get update
sudo apt-get install -y mongodb-org

```

More detailed information can be found at: [MongoDB](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/)

If you are using any other GNU/Linux distribution [this](https://docs.mongodb.com/manual/administration/install-on-linux/) link may be usefull to you.
For other OS please refer to [this](https://docs.mongodb.com/manual/installation/) link.

- Python:

To install python please refer to [this](https://wiki.python.org/moin/BeginnersGuide/Download) link. Once python is installed make sure [pip](https://pip.pypa.io/en/stable/installing/) is installed and then install [pymongo](http://api.mongodb.com/python/current/installation.html) the database connector for MongoDB.

With all this dependencies satisfied you are now ready to go.

### Installing

For GNU/Linux based OS users:

Please use the signed version of the app, you can find it [here](https://addons.mozilla.org/en-US/firefox/addon/jsloader/), otherwise follow this instructons:

```
git clone -b master --single-branch --recurse-submodules https://github.com/szz-dvl/JSLoader.git
cd JSLoader
./build

```

This must be enough to create the .xpi **jsload-unsigned.xpi** and install the native app.

There is no support at this point for windows users, however to create the .xpi just zip all the extension and renameit to anything ".xpi". To install the native app please follow [this](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_manifests) manuals.

## Using the extension

Once the extension is installed you will se a new page action available ![alt text](https://github.com/szz-dvl/JSLoader/blob/master/fg/icons/blue-diskette-16.png) in the pages that are sensible to allow scripts. When you click on it a new menu will show up allowing you to manage the scripts on this site or add new ones. If there is no info stored for this page the image will be blue, as shown above, otherwise a red diskette ![alt text](https://github.com/szz-dvl/JSLoader/blob/master/fg/icons/red-diskette-16.png) will be shown. The extension admin panel will be available in the preferences page of the extension. You will be able to configure some settings in there. Additionally there are three shortcuts available:

- Alt + Shift + 1: Open an editor binded to the focused tab.
- Alt + Shift + 2: Open an editor to create a group script.
- Alt + Shift + Q: Open admin panel.

Groups are another way to manage scripts. Sometimes there is not enough for an script to run in one domain, in this cases a group may be created to store any number of domains that will receive the scripts added to this group.

## Creating Scripts

Scripts are written as usual in javascript. There is an API that will be explained in future releases, those willing to use it may refer to [content_api.js](https://github.com/szz-dvl/JSLoader/blob/master/bg/content_api.js). If the extensioon is installed Please look for the button "Load Examples" in the preferences page (Alt + Shift + Q), where you will find a complete set of exampls for the API provided.

## Built With

* [ACE editor](https://ace.c9.io/) - The code editor used
* [AngularJS](https://angularjs.org/) - MVW
* [Python](https://www.python.org/) - Native app
* [MongoDB](https://www.mongodb.com/) - Database
* [GitHub](https://github.com/) - Hosting

## Contributing

Mail me if you want to lend a hand.

## Authors

* **Szz** 

## License

This project is licensed under the Affero GPL license - see the [LICENSE](LICENSE) file for details

## Acknowledgments

* Any one using this project

