using Pulumi;
using Awsx = Pulumi.Awsx;

class MyStack : Stack
{
    public MyStack()
    {
        var trail = new Awsx.Cloudtrail.Trail("dotnet-trail", new Awsx.Cloudtrail.TrailArgs
        {
            EnableLogging = true,
        });
    }
}
